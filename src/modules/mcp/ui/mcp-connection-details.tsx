import { CopyButton } from '@/shared/ui/action/copy-button';

interface McpConnectionDetailsProps {
  endpoint: string;
  configJson: string;
  addressLabel: string;
  configLabel: string;
  copyAddressLabel: string;
  copyConfigLabel: string;
}

export function McpConnectionDetails({
  endpoint,
  configJson,
  addressLabel,
  configLabel,
  copyAddressLabel,
  copyConfigLabel,
}: McpConnectionDetailsProps) {
  return (
    <div className="mcp-connection-details">
      <section className="art-guide-address">
        <h2>{addressLabel}</h2>
        <div className="art-guide-address__bar">
          <code>{endpoint}</code>
          <CopyButton
            className="art-guide-address__copy"
            value={endpoint}
            label={copyAddressLabel}
            showLabel
          />
        </div>
      </section>
      <section className="mcp-config-code">
        <header className="mcp-config-code__header">
          <h2>{configLabel}</h2>
          <CopyButton
            className="mcp-config-code__copy"
            value={configJson}
            label={copyConfigLabel}
            showLabel
          />
        </header>
        <pre>
          <code>{configJson}</code>
        </pre>
      </section>
    </div>
  );
}
