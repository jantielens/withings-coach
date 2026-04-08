// No-op rehype plugin mock for Jest (avoids ESM resolution issues)
module.exports = function () {
  return function (tree) {
    return tree;
  };
};
