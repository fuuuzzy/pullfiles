export function parseChineseNumber(str: string): number {
	const numMap: Record<string, number> = {
		零: 0,
		一: 1,
		二: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
		七: 7,
		八: 8,
		九: 9,
		十: 10,
		百: 100,
		千: 1000,
		两: 2,
	};

	let result = 0;
	let temp = 0;
	let sec = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charAt(i);
		const num = numMap[char];

		if (num === undefined) continue;

		if (num === 10 || num === 100 || num === 1000) {
			if (temp === 0) temp = 1;
			if (num === 10) {
				sec += temp * num;
				temp = 0;
			} else {
				sec += temp * num;
				temp = 0;
			}
		} else {
			temp = num;
		}
	}
	result += sec + temp;
	return result;
}

export function parseEpisodeNumber(filename: string): number | null {
	// Chinese numbers: 第三集
	const zhMatch = filename.match(/第([零一二三四五六七八九十百千两]+)集/);
	if (zhMatch?.[1]) {
		return parseChineseNumber(zhMatch[1]);
	}

	// Arabic numbers with Chinese prefix: 第1集
	const zhArabicMatch = filename.match(/第(\d+)集/);
	if (zhArabicMatch?.[1]) {
		return parseInt(zhArabicMatch[1], 10);
	}

	// Strict EP pattern — "EP" required, digits follow directly or after space
	// Matches: EP01, Ep02, ep03, EP 01
	// Does NOT match: E01, Episode01
	const epMatch = filename.match(/\bEP\s*(\d+)/i);
	if (epMatch?.[1]) {
		return parseInt(epMatch[1], 10);
	}

	// S01E02 format
	const sXXeXXMatch = filename.match(/[Ss](\d+)[Ee](\d+)/i);
	if (sXXeXXMatch?.[2]) {
		return parseInt(sXXeXXMatch[2], 10);
	}

	const fallbackPatterns = [
		/-\s*(\d+)(?:\.\w+)?$/, // -07.mp4
		/^\[?(\d{2,3})\]?/, // [02], 02
		/(?:\s|^)(\d+)\.\w+$/, // 1.mp4
	];

	for (const pattern of fallbackPatterns) {
		const match = filename.match(pattern);
		if (match?.[1]) {
			return parseInt(match[1], 10);
		}
	}

	return null;
}
