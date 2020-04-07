pragma solidity 0.5.8;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";


library SafeTransfer {
  event TransferFailed(address indexed _tokenAddress, address indexed _to, uint256 _amount, bool _isRevert);

  /**
   * @dev Wraps an RRC20 transfer with a low level call to handle revert secenario
   * Emits TransferFailed with _isRevert flag on in case it actually revert, false on case the call result is false
   * @param _token ERC20 token to transfer from.
   * @param _to receipint address
   * @param _amount to be transfere
   * @return true if completed, false if reverted or token returns false
   */
  function doTransfer(IERC20 _token, address _to, uint256 _amount) internal returns (bool) {
    // This creates a low level call to the _token
    // solium-disable-next-line security/no-low-level-calls
    (bool success, bytes memory returnData) = address(_token).call(
      abi.encodePacked( // This encodes the function to call and the parameters to pass to that function
        _token.transfer.selector, // This is the function identifier of the function we want to call
        abi.encode(_to, _amount) // This encodes the parameter we want to pass to the function
      )
    );
    if (success) {
      // transfer completed successfully (did not revert)
      bool callResult = abi.decode(returnData, (bool));
      // transfer could have return false thou, indicating the operation was not completed
      if (!callResult) emit TransferFailed(address(_token), _to, _amount, false);
      return callResult;
    } else {
      // transfer reverted
      emit TransferFailed(address(_token), _to, _amount, true);
      return false;
    }
  }
}
