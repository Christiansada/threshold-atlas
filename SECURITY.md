# Security and privacy

The app accepts numeric CSV data, computes locally, and exports aggregates. It has no authentication, backend, analytics, local-storage persistence, or network request for imported data.

Do not submit real private data in bug reports. Supply a minimal synthetic reproduction. If a future public repository enables private vulnerability reporting, use its Security tab for sensitive reports; otherwise avoid publishing exploit details and use GitHub's support/reporting channels.

Keep the development server bound to loopback. Static hosting should use HTTPS. A compromised hosting origin or browser extension could still access an imported dataset, so browser-local processing is not a guarantee against every threat.
