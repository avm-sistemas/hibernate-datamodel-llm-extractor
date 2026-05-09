# Hibernate Data Model Extractor

# LogOne Data Model Extractor

A pragmatic utility designed to crawl through massive Hibernate mapping landscapes (`.hbm.xml`) and consolidate them into a structured, LLM-ready Data Dictionary (Markdown). 

This tool was built to solve the "context window" problem for AI agents (Copilot, Cursor, Gemini, etc.) working on large-scale legacy systems, especially those using **AndroMDA**.

## 🚀 Core Principles
* **Performance over "Contraptions":** Recursively scans hundreds of mapping files in seconds.
* **Operational Efficiency:** Single-binary execution. No Node.js runtime required on the target machine.
* **KISS (Keep It Simple, Stupid):** No complex UI. Just a CLI that does one thing: turns messy XML into clean, semantic Markdown.

## 🛠️ Usage
1. Download the binary for your OS from the **GitHub Actions** tab (under Artifacts).
2. Run it via terminal, passing the root directory of your project mappings:
   ```bash
   ./datamodel-llm-extractor-win.exe "C:/Projects/First/source" data-dictionary.md