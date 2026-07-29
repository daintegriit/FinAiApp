const { defineConfig } = require("eslint/config");

const expoConfig =
  require("eslint-config-expo/flat");

const importPlugin =
  require("eslint-plugin-import");

module.exports = defineConfig([
  expoConfig,

  {
    plugins: {
      import: importPlugin,
    },

    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },

        node: {
          extensions: [
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
          ],
        },
      },
    },

    rules: {

      // =========================================
      // IMPORTS
      // =========================================

      "import/no-unresolved":
        "off",

      // =========================================
      // TS
      // =========================================

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // =========================================
      // REACT
      // =========================================

      "react/react-in-jsx-scope":
        "off",
    },
  },
]);