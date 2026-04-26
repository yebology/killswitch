// Standard Anchor migration/deploy script
const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider
  anchor.setProvider(provider);

  // Add deploy script logic here if needed
  console.log("Guardian program deployed successfully");
};
