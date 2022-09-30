const { artifacts, contract } = require('hardhat')
const { bn } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')
const { getEvents } = require('@aragon/contract-helpers-test/src/events')

const WithdrawalQueue = artifacts.require('WithdrawalQueue.sol')

const ETH = (value) => bn(web3.utils.toWei(value + '', 'ether'))
const tokens = ETH

contract('WithdrawalQueue', ([deployer, owner, holder, stranger]) => {
  console.log('Addresses:')
  console.log(`Deployer: ${deployer}`)
  console.log(`Owner: ${owner}`)

  let withdrawal

  beforeEach('Deploy', async () => {
    withdrawal = await WithdrawalQueue.new(owner)
  })

  context('Create a ticket', async () => {
    let ticketId

    beforeEach('Read some state', async () => {
      ticketId = await withdrawal.queueLength()
    })

    it('Owner can create a ticket', async () => {
      await withdrawal.createTicket(holder, 1, 1, { from: owner })

      assertBn(await withdrawal.holderOf(ticketId), holder)
      assertBn(await withdrawal.queueLength(), +ticketId + 1)
      assert(ticketId >= (await withdrawal.finalizedQueueLength()))
      const ticket = await withdrawal.queue(ticketId)
      assert.equal(ticket[0], holder)
      assertBn(ticket[1], bn(1))
      assertBn(ticket[2], bn(1))
    })

    it('Only owner can create a ticket', async () => {
      await assertRevert(withdrawal.createTicket(holder, 1, 1, { from: stranger }), 'NOT_OWNER')
      await assertRevert(withdrawal.holderOf(ticketId), 'TICKET_NOT_FOUND')

      assertBn(await withdrawal.queueLength(), ticketId)
    })
  })

  context('Withdraw', async () => {
    let ticketId, amount
    beforeEach('Create a ticket', async () => {
      ticketId = await withdrawal.queueLength()
      await withdrawal.createTicket(holder, 1, 1, { from: owner })
    })

    it('One cant withdraw not finalized ticket', async () => {
      await assertRevert(withdrawal.withdraw(ticketId, { from: owner }), 'TICKET_NOT_FINALIZED')
    })

    it('Anyone can withdraw a finalized token', async () => {
      const balanceBefore = bn(await web3.eth.getBalance(holder))
      await withdrawal.finalizeTickets(0, 1, { from: owner, value: 1 })

      await withdrawal.withdraw(ticketId, { from: stranger })

      assertBn(await web3.eth.getBalance(holder), balanceBefore.add(bn(1)))
    })

    it('Cant withdraw token two times', async () => {
      await withdrawal.finalizeTickets(0, 1, { from: owner, value: 1 })
      await withdrawal.withdraw(ticketId)

      await assertRevert(withdrawal.withdraw(ticketId, { from: stranger }), 'TICKET_NOT_FOUND')
    })
  })
})
