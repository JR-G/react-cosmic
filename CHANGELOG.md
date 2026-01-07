# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-07

### Added
- CRDT-based offline-first React state management using Yjs
- `OrbitProvider` component for state management context
- `useOrbit` hook for primitive values with automatic persistence
- `useOrbitText` hook for collaborative text editing with granular diffing
- `useOrbitObject` hook for nested object updates
- `useOrbitStatus` hook for WebSocket connection status monitoring
- `useOrbitAwareness` hook for real-time presence data
- `useSetLocalAwareness` hook for broadcasting presence state
- IndexedDB persistence adapter with automatic debounced saves
- Cross-tab synchronization via BroadcastChannel
- WebSocket-based real-time collaboration support
- Circuit breaker pattern for WebSocket connection failures
- Full TypeScript support with comprehensive type definitions
- Working examples: basic form demo and collaborative editing demo

### Changed
- N/A (initial stable release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.1] - 2026-01-07

### Fixed
- Renamed library to react-cosmic
- Updated README with correct repository URL

## [0.1.0] - 2026-01-07

### Added
- Initial release with core CRDT functionality
- Basic React hooks and provider
- IndexedDB storage support
- Tab synchronization
- WebSocket collaboration features
