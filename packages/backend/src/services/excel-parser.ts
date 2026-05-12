import { LANGUAGE_MAP } from "@ls-pull-video/shared";
import * as XLSX from "xlsx";

export interface ExcelRow {
	title: string;
	episode_no: string;
	total_parts: number | null;
	language: string | null;
	description: string | null;
	baidu_link: string;
}

function extractBaiduLink(raw: string): string {
	return raw.trim();
}

export function parseExcel(buffer: Buffer): ExcelRow[] {
	const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		throw new Error("Excel file has no sheets");
	}

	const worksheet = workbook.Sheets[sheetName];
	if (!worksheet) {
		throw new Error("Sheet not found");
	}

	const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

	const rows: ExcelRow[] = [];
	for (const rawRow of rawJson) {
		const row: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(rawRow)) {
			row[key.trim()] = value;
		}

		const title = String(row.剧标题 ?? "").trim();
		const episode_no = String(row.剧编号 ?? "").trim();
		const baidu_link = row.百度云链接 ? extractBaiduLink(String(row.百度云链接)) : "";

		if (!title || !episode_no || !baidu_link) {
			continue;
		}

		const rawLang = row.语言 ? String(row.语言).trim() : null;
		const language = rawLang ? (LANGUAGE_MAP[rawLang] ?? rawLang) : null;

		rows.push({
			title,
			episode_no,
			total_parts: row.集数 ? Number(row.集数) : null,
			language,
			description: row.剧简介 ? String(row.剧简介).trim() : null,
			baidu_link,
		});
	}

	return rows;
}
