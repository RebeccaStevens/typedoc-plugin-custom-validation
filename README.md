<div align="center">

# typedoc-plugin-require-tags

[![npm version](https://img.shields.io/npm/v/typedoc-plugin-require-tags.svg)](https://www.npmjs.com/package/typedoc-plugin-require-tags)
[![CI](https://github.com/RebeccaStevens/typedoc-plugin-require-tags/actions/workflows/release.yml/badge.svg)](https://github.com/RebeccaStevens/typedoc-plugin-require-tags/actions/workflows/release.yml)
[![Coverage Status](https://codecov.io/gh/RebeccaStevens/typedoc-plugin-require-tags/branch/main/graph/badge.svg?token=MVpR1oAbIT)](https://codecov.io/gh/RebeccaStevens/typedoc-plugin-require-tags)\
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![GitHub Discussions](https://img.shields.io/github/discussions/RebeccaStevens/typedoc-plugin-require-tags?style=flat-square)](https://github.com/RebeccaStevens/typedoc-plugin-require-tags/discussions)
[![BSD 3 Clause license](https://img.shields.io/github/license/RebeccaStevens/typedoc-plugin-require-tags.svg?style=flat-square)](https://opensource.org/licenses/BSD-3-Clause)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](https://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

</div>

## Donate

[Any donations would be much appreciated](./DONATIONS.md). 😄

## Installation

```sh
# Install with npm
npm install -D typedoc-plugin-require-tags

# Install with pnpm
pnpm add -D typedoc-plugin-require-tags

# Install with yarn
yarn add -D typedoc-plugin-require-tags
```

## Usage

All options are configured in the `customValidation` option.

### `byKind`

This option is for specifying requirements for each kind of node.

Example: Require all functions to have a summary and have an `@example` tag.

```json
{
  "plugin": ["typedoc-plugin-require-tags"],
  "customValidation": {
    "byKind": [
      {
        "kinds": "Function",
        "summary": true,
        "tags": ["example"]
      }
    ]
  }
}
```

### My Tags Don't Exists?

Due to the way typedoc works, some tags may be move to other nodes than the one they were defined on.

For example, `@param` tags are removed from the `Function` node they are defined on and its content is put onto the corresponding `Parameter` node.
You can require parameters to be documented with:

```json
{
  "plugin": ["typedoc-plugin-require-tags"],
  "customValidation": {
    "byKind": [
      {
        "kinds": "Parameter",
        "summary": true
      }
    ]
  }
}
```
