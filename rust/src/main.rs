// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
mod worksheet;

use axum::{
    Json, Router,
    extract::DefaultBodyLimit,
    http::{StatusCode, header},
    response::{Html, IntoResponse},
    routing::{get, post},
};
use worksheet::{RenderResult, Worksheet, render};

async fn render_worksheet(
    Json(config): Json<Worksheet>,
) -> Result<Json<RenderResult>, (StatusCode, String)> {
    render(&config)
        .map(Json)
        .map_err(|message| (StatusCode::BAD_REQUEST, message))
}

fn asset(content_type: &'static str, bytes: &'static [u8]) -> impl IntoResponse {
    (
        [
            (header::CONTENT_TYPE, content_type),
            (header::CACHE_CONTROL, "no-cache"),
        ],
        bytes,
    )
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".into())
        .parse::<u16>()?;
    let app = Router::new()
        .route(
            "/",
            get(|| async { Html(include_str!("../static/index.html")) }),
        )
        .route(
            "/app.css",
            get(|| async {
                asset(
                    "text/css; charset=utf-8",
                    include_bytes!("../static/app.css"),
                )
            }),
        )
        .route(
            "/app.js",
            get(|| async {
                asset(
                    "text/javascript; charset=utf-8",
                    include_bytes!("../static/app.js"),
                )
            }),
        )
        .route(
            "/fonts/PatrickHand-Regular.ttf",
            get(|| async {
                asset(
                    "font/ttf",
                    include_bytes!("../static/fonts/PatrickHand-Regular.ttf"),
                )
            }),
        )
        .route(
            "/fonts/Caveat.ttf",
            get(|| async { asset("font/ttf", include_bytes!("../static/fonts/Caveat.ttf")) }),
        )
        .route("/api/render", post(render_worksheet))
        .route("/health", get(|| async { "ok" }))
        .layer(DefaultBodyLimit::max(512 * 1024));
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).await?;
    println!("Letter & Line is ready: http://127.0.0.1:{port}");
    println!("Press Ctrl+C to stop.");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
