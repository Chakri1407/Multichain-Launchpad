use anchor_lang::prelude::*;
use std::str::FromStr;
use std::fs;
use chrono::Utc;
use serde_json::json;

#[derive(Serialize, Deserialize, Debug)]
struct DeploymentConfig {
    program_id: String,
    network: String,
    deployment_timestamp: String,
    authority: String,
}

pub fn deploy() -> Result<()> {
    // Load or generate keypair
    let authority = Keypair::new();
    let program_id = authority.pubkey();

    // Configure Solana CLI
    solana_cli_config::Config {
        json_rpc_url: "https://api.devnet.solana.com".to_string(),
        websocket_url: "wss://api.devnet.solana.com".to_string(),
        keypair_path: authority.to_string(),
    };

    // Build and deploy program
    let program_path = std::path::Path::new("target/deploy/launchpad.so");
    let deploy_cmd = std::process::Command::new("solana")
        .args(&[
            "program", 
            "deploy", 
            program_path.to_str().unwrap(),
            "--url", 
            "devnet"
        ])
        .output()
        .expect("Failed to deploy program");

    // Prepare deployment log
    let deployment_config = DeploymentConfig {
        program_id: program_id.to_string(),
        network: "solana-devnet".to_string(),
        deployment_timestamp: Utc::now().to_rfc3339(),
        authority: authority.pubkey().to_string(),
    };

    // Write deployment log
    let log_content = serde_json::to_string_pretty(&deployment_config)?;
    fs::write(
        format!("logs/solana-deployment-{}.json", Utc::now().timestamp()),
        log_content
    )?;

    Ok(())
}