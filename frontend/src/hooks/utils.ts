export function formatNotification(data: any) {
  return (
    `🔔 ${data.asset} • ${data.signal}\n` +
    `Status: ${data.status} (${data.value})\n` +
    `Range: ${data.min} - ${data.max}\n` +
    `Deviation: ${data.percent}%\n` +
    `⏱ ${new Date(data.timestamp).toLocaleString()}`
  );
}
