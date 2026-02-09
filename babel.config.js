module.exports = {
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-transform-flow-strip-types',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-syntax-jsx',
    '@babel/plugin-transform-react-jsx'
  ]
};
