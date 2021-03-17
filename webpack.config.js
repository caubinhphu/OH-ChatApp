const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const extractPlugin = new ExtractTextPlugin({
  filename: 'css/[name].css',
});

const babelPolyfill = 'babel-polyfill'

module.exports = {
  entry: {
    // home: [
    //   babelPolyfill,
    //   './src/scripts/home.js',
    //   './src/styles/app-meeting.scss',
    // ],
    // 'create-room': [babelPolyfill, './src/scripts/create-room.js'],
    // 'join-room': [babelPolyfill, './src/scripts/join-room.js'],
    // 'chat-room-host': [babelPolyfill, './src/scripts/chat-room-host.js'],
    // 'chat-room': [babelPolyfill, './src/scripts/chat-room.js'],
    'home-messenger': [
      babelPolyfill,
      './src/scripts/home-messenger.js',
      './src/styles/app-messenger.scss',
    ],
    // 'msg-profile': [babelPolyfill, './src/scripts/msg-profile.js'],
    'msg-setting': [babelPolyfill, './src/scripts/msg-setting.js'],
    'msg-chat-media': [babelPolyfill, './src/scripts/msg-chat-media.js'],
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].js',
  },
  module: {
    rules: [{
        test: /\.js$/,
        exclude: path.join(__dirname, '/node_modules'),
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        }, ],
      },
      {
        test: /\.scss$/i,
        use: extractPlugin.extract({
          use: [
            // Creates `style` nodes from JS strings
            // "style-loader",
            // Translates CSS into CommonJS
            {
              loader: 'css-loader',
              options: {
                url: false,
                minimize: false,
              },
            },
            // Compiles Sass to CSS
            {
              loader: 'sass-loader',
              options: {
                config: {
                  path: path.resolve(__dirname, 'node_modules'),
                },
                outputStyle: 'expanded',
                sourceMap: true,
                sourceMapContents: true,
                url: false,
                minimize: false,
              },
            },
          ],
        }),
      },
      // {
      //   test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
      //   use: {
      //     loader: 'file-loader',
      //     options: {
      //       name: '[path][name].[ext]'
      //     }
      //   }
      // }
    ],
  },
  plugins: [
    extractPlugin,
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
    // new webpack.LoaderOptionsPlugin({
    //   optimization: {
    //     // minimizer: [new UglifyJSPlugin()],
    //     minimizer: false,
    //   },
    // }),
  ],
  optimization: {
    minimize: false,
  },
};