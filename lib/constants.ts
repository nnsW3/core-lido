import { streccak } from "./keccak";

export const MAX_UINT256 = 2n ** 256n - 1n;
export const INITIAL_STETH_HOLDER = "0x000000000000000000000000000000000000dEaD";

// https://eips.ethereum.org/EIPS/eip-165

// bytes4(keccak256('supportsInterface(bytes4)'))
export const ERC165_INTERFACE_ID = "0x01ffc9a7";

// XOR of all the method selectors
export const ERC721_INTERFACE_ID = "0x80ac58cd";
export const ERC721METADATA_INTERFACE_ID = "0x5b5e139f";

// 0x49064906 is magic number ERC4906 interfaceId as defined in the standard https://eips.ethereum.org/EIPS/eip-4906
export const ERC4906_INTERFACE_ID = "0x49064906";

// special reserved interface id
export const INVALID_INTERFACE_ID = "0xffffffff";

// OZ Interfaces
export const OZ_ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
export const OZ_ACCESS_CONTROL_ENUMERABLE_INTERFACE_ID = "0x5a05180f";

export const BLOCK_TIME = 12n;

// Default admin role for AccessControl compatible contracts
export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Withdrawal Queue related constants
export const WITHDRAWAL_MAX_BATCHES_LENGTH = 36n;

export const WITHDRAWAL_BUNKER_MODE_DISABLED_TIMESTAMP = MAX_UINT256;
export const WITHDRAWAL_PAUSE_INFINITELY = MAX_UINT256;

export const WITHDRAWAL_MIN_STETH_WITHDRAWAL_AMOUNT = 100n;
export const WITHDRAWAL_MAX_STETH_WITHDRAWAL_AMOUNT = 10n ** 21n; // 1000 * 1e18

export const WITHDRAWAL_FINALIZE_ROLE = streccak("FINALIZE_ROLE");
export const WITHDRAWAL_MANAGE_TOKEN_URI_ROLE = streccak("MANAGE_TOKEN_URI_ROLE");
export const WITHDRAWAL_ORACLE_ROLE = streccak("ORACLE_ROLE");
export const WITHDRAWAL_PAUSE_ROLE = streccak("PAUSE_ROLE");
export const WITHDRAWAL_RESUME_ROLE = streccak("RESUME_ROLE");
