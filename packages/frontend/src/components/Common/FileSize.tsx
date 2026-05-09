export function FileSize({ bytes }: { bytes: number | null }) {
	if (bytes === null || bytes === undefined)
		return <span style={{ color: "var(--color-text-muted)" }}>—</span>;

	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return (
		<span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
			{unitIndex === 0 ? size : size.toFixed(1)} {units[unitIndex]}
		</span>
	);
}
