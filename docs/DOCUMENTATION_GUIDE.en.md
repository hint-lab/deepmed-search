# Documentation Organization Guide

> English | [中文](./DOCUMENTATION_GUIDE.md)

This document explains the documentation structure and maintenance standards for the DeepMed Search project.

## 📁 Directory Structure

```
docs/
├── README.md                    # Documentation Center Home (Chinese)
├── README.en.md                 # Documentation Center Home (English)
├── DOCUMENTATION_GUIDE.md       # Documentation Organization Guide
│
├── deployment/                  # Deployment Documentation
│   ├── SSL_QUICKSTART.md        # SSL Quick Start (Chinese)
│   ├── SSL_QUICKSTART.en.md     # SSL Quick Start (English)
│   ├── TRAEFIK_SSL_SETUP.md     # Traefik SSL Detailed Setup
│   ├── DEPLOYMENT_CHECKLIST.md  # Deployment Checklist
│   └── setup-ssl.sh             # SSL Setup Script
│
├── setup/                       # Setup Guides
│   ├── OAUTH_SETUP.md           # OAuth Authentication Setup
│   ├── DOCUMENT_PARSER_SETUP.md # Document Parser Setup
│   ├── ENCRYPTION_KEY_SETUP.md  # Encryption Key Setup
│   ├── REALTIME_PROGRESS.md     # Real-time Progress Configuration
│   ├── PROGRESS_QUICKSTART.md   # Progress Feature Quick Start
│   ├── BULLMQ_BOARD_USAGE.md    # BullMQ Board Usage
│   ├── ATTU_USAGE.md            # Attu Usage Guide
│   └── REDIS_QUEUE_VIEWING.md   # Redis Queue Viewing
│
├── development/                 # Development Documentation
│   ├── QUEUE_SERVICE_MIGRATION.md              # Queue Service Migration
│   ├── SEARCH_CONFIG_IMPLEMENTATION.md         # Search Configuration
│   ├── MULTI_LLM_CONFIG_UPDATE.md             # Multi-LLM Configuration
│   ├── USER_LLM_CONFIG_IMPLEMENTATION.md      # User LLM Configuration
│   ├── TOOLS_ANALYSIS.md                      # Tools Analysis
│   └── SUMMARY.md                             # Project Summary
│
├── troubleshooting/            # Troubleshooting
│   └── GOOGLE_OAUTH_FIX.md     # Google OAuth Fix
│
└── api/                        # API Documentation (Reserved)
    └── (To be added)
```

## 📝 Document Naming Convention

### Main Documents
- **Chinese Version**: `DOCUMENT_NAME.md`
- **English Version**: `DOCUMENT_NAME.en.md`

### Examples
```
SSL_QUICKSTART.md       # Chinese version
SSL_QUICKSTART.en.md    # English version
```

### Rules
1. Use uppercase letters and underscores
2. Add `.en` suffix for English versions
3. Keep filenames concise and descriptive

## 🌐 Bilingual Documentation Requirements

### Documents That Must Be Bilingual

The following types of documents should provide both Chinese and English versions:

1. **User-Facing Documentation**
   - Quick start guides
   - Deployment guides
   - Setup instructions

2. **Important Documents**
   - README files
   - Documentation indexes
   - FAQs

### Documents That Can Be Unilingual

The following documents can use a single language:

1. **Technical Implementation Details**
   - Internal architecture descriptions
   - Code migration records
   - Development notes

2. **Temporary Documents**
   - Troubleshooting logs
   - Experimental feature descriptions

## 📋 Documentation Writing Standards

### Markdown Format

1. **Heading Levels**
   ```markdown
   # H1 - Document Title
   ## H2 - Main Sections
   ### H3 - Subsections
   #### H4 - Detailed Notes
   ```

2. **Code Blocks**
   ````markdown
   ```bash
   # Command example
   docker compose up -d
   ```
   ````

3. **Links**
   ```markdown
   # Relative links (recommended)
   [Documentation Center](./README.en.md)
   
   # Absolute links
   [GitHub](https://github.com/...)
   ```

### Content Structure

Each document should include:

1. **Title and Language Switcher**
   ```markdown
   # Document Title
   
   > English | [中文](./DOCUMENT.md)
   ```

2. **Introduction**
   - Document purpose
   - Use cases

3. **Main Content**
   - Clear section divisions
   - Code examples
   - Screenshots (if needed)

4. **References**
   - Related documents
   - External resources

### Document Templates

#### English Document Template

```markdown
# Document Title

> English | [中文](./DOCUMENT.md)

Brief description of the document's purpose and content.

## Overview

Detailed introduction...

## Prerequisites

- Requirement 1
- Requirement 2

## Steps

### Step 1: XXX

Explanation...

\`\`\`bash
# Command example
command here
\`\`\`

### Step 2: XXX

Explanation...

## Troubleshooting

### Issue 1

Solution...

## References

- [Related Document](./RELATED.en.md)
- [External Link](https://example.com)

---

**Last Updated**: YYYY-MM-DD
```

#### Chinese Document Template

```markdown
# 文档标题

> [English](./DOCUMENT.en.md) | 中文

简要说明这个文档的目的和内容。

## 概述

详细介绍...

## 前置条件

- 条件 1
- 条件 2

## 步骤

### 步骤 1: XXX

说明...

\`\`\`bash
# 命令示例
command here
\`\`\`

### 步骤 2: XXX

说明...

## 故障排查

### 问题 1

解决方法...

## 参考资料

- [相关文档](./RELATED.md)
- [外部链接](https://example.com)

---

**最后更新**: YYYY-MM-DD
```

## 🔄 Documentation Update Process

### Adding New Documentation

1. **Determine Category**
   - Deployment: `docs/deployment/`
   - Setup: `docs/setup/`
   - Development: `docs/development/`
   - Troubleshooting: `docs/troubleshooting/`
   - API: `docs/api/`

2. **Create Documents**
   ```bash
   # Create Chinese version
   touch docs/category/DOCUMENT_NAME.md
   
   # Create English version
   touch docs/category/DOCUMENT_NAME.en.md
   ```

3. **Update Index**
   - Add link in `docs/README.md` (Chinese)
   - Add link in `docs/README.en.md` (English)

### Updating Existing Documentation

1. **Modify document content**
2. **Sync bilingual versions** (if applicable)
3. **Update "Last Updated" date**
4. **Test link validity**

### Moving Documentation

1. **Move files**
   ```bash
   mv docs/old-location/DOC.md docs/new-location/
   ```

2. **Update all references**
   - Search for all links to the document
   - Update to new path

3. **Update documentation index**

## 🔍 Documentation Checklist

Before submitting documentation, confirm:

- [ ] Document is in the correct category directory
- [ ] Uses correct naming convention
- [ ] Provides bilingual versions (if required)
- [ ] Markdown format is correct
- [ ] Code examples are runnable
- [ ] Links are valid
- [ ] Entry added to documentation index
- [ ] Includes "Last Updated" date

## 🛠️ Maintenance Tools

### Check Broken Links

```bash
# Using markdown-link-check
npm install -g markdown-link-check
find docs -name "*.md" -exec markdown-link-check {} \;
```

### Format Documents

```bash
# Using prettier
npx prettier --write "docs/**/*.md"
```

## 📦 Module Documentation

In addition to the `docs/` directory, each module should maintain its own README:

```
src/lib/module-name/
├── README.md          # Module description
└── ...
```

Module README should include:
- Module purpose
- API documentation
- Usage examples
- Configuration options

## 🤝 Contribution Guide

### Documentation Contribution Process

1. **Fork the project**
2. **Create a branch**
   ```bash
   git checkout -b docs/your-document-name
   ```
3. **Write documentation**
4. **Complete checklist** (see above)
5. **Submit PR**

### Documentation Review Criteria

Documentation PRs will check:
- Content accuracy
- Format compliance
- Link validity
- Bilingual consistency (if applicable)
- Code example executability

## 📮 Feedback

For documentation issues:
- Submit Issue with `documentation` label
- PR to fix documentation issues
- Suggest improvements in discussions

## 🔗 Related Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs](https://www.writethedocs.org/)

---

**Last Updated**: 2024-11-14

