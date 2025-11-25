# Contributing to Home System

First off, thank you for considering contributing to Home System! It's people like you that make Home System such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by the [Home System Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if applicable**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

- Fill in the required template
- Follow the coding style used throughout the project
- Include appropriate test cases
- Update documentation as needed
- End all files with a newline

## Development Process

### Setup Development Environment

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test your changes: `npm start` and verify manually
7. Commit your changes: `git commit -m "Add some feature"`
8. Push to your fork: `git push origin feature/your-feature-name`
9. Submit a pull request

### Coding Standards

- Use meaningful variable and function names
- Write clear comments for complex logic
- Follow existing code formatting (use Prettier: `npm run format`)
- Keep functions small and focused
- Write self-documenting code

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## Project Structure

Please familiarize yourself with the project structure:

- `models/` - Mongoose data models
- `routes/` - Express API routes
- `middleware/` - Custom middleware functions
- `utils/` - Utility functions and helpers
- `dist/` - Compiled frontend assets
- `src/` - Frontend source files

## Testing

Currently, the project uses manual testing. When adding new features:

1. Start the server: `npm start`
2. Test all affected functionality
3. Test edge cases
4. Verify error handling

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing!
