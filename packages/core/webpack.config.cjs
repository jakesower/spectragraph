const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	context: __dirname,
	entry: path.join(__dirname, "src", "web.jsx"),
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/env", "babel-preset-solid"],
					},
				},
			},
			{
				test: /\.(ico)$/,
				type: "asset/resource",
			},
			{
				test: /\.s[ac]ss$/i,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader",
				],
			},
		],
	},
	output: {
		clean: true,
		filename: "bundle.js",
		path: path.resolve(__dirname, "build"),
	},
	devServer: {
		historyApiFallback: true,
		static: {
			directory: path.join(__dirname, "public"),
			publicPath: "/",
		},
	},
	plugins: [
		new webpack.ProgressPlugin(),
		new HtmlWebpackPlugin({
			template: path.join(__dirname, "public", "index.html"),
			favicon: path.join(__dirname, "public", "favicon.ico"),
			filename: "index.html",
			inject: "body",
		}),
	],
};
