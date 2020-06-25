# Testnet contracts
  "rskTestnet": {
    "dex": "0xc791FeB740eFFE7ddA793250A05057792f4969e6",
    "doc": "0x4EDe91faEE4e26104bFa8cDdb23e6cF480394439",
    "wrbtc": "0xbE326F6a79B984a13DF49ae4fF44d377BF9E3796",
    "test": "0x5De2318EE70a0469A32d494cc875d89DFe90102E",
    "bpro": "0xa72f49662748C994D80f5556Bf9cf2E9d33d1474",
    "proxyAdmin": "0x93176E10a2962061D92617a06abE3F5850E18CD6",
    "upgradeDelegator": "0xc3aaFB85466Fb3D70b4dd801f694add6260997e3",
    "governor": "0xD63C0441b9A6c019917e9773992F7B5428542cbb",
    "stopper": "0x7936cA4f95a662ABe0b1d9B41Ce89eE0Bc704824",
    "commissionManager": "0xB88223CA24E403990a0b352D0A51D9aA588d8267"
  }

# Testnet Price Providers
Price Provider Fake. Fixed price = 2 => DOC - Test, ERBTC - Test
Price Provider Las Closing Price: DOC - BPRO, DOC - ERBTC, ERCT - BPRO

"externalPriceProvider": {
      "DocToken": {
        "BproToken": "0xf11341C511f206A4F2AD5d22Bd664e236B1025dF", Last Closing Type
        "WRBTC": "0x723a7f03Cf881733f51246fa743e2651746908b9", Last Closing Type
        "TestToken": "0x4BBA7cD4Ef98D58792EDbff8793B436c6BcB4a2f" (Fake)
      },
      "WRBTC": {
        "BproToken": "0xa19716F55aA865ebb7f838b7b3981195BF6e89F9", Last Closing Type
        "TestToken": "0xD0eCeC2769Fb7fedF6e697DE1a09779e369a5213" (Fake)
      }
    }