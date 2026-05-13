import type { EpisodeStatus } from "@ls-pull-video/shared";
import { useState } from "react";
import { EpisodeFolderList } from "../components/Episodes/EpisodeFolderList.js";
import { useEpisodesGrouped } from "../hooks/useEpisodes.js";

export function EpisodesPage() {
	const [filter, setFilter] = useState<EpisodeStatus | "all">("all");

	const { data, isLoading } = useEpisodesGrouped(filter !== "all" ? filter : undefined);

	const folders = data?.folders ?? [];
	const counts = data?.counts ?? {
		pending: 0,
		unparsed: 0,
		downloading: 0,
		downloaded: 0,
		compressing: 0,
		uploading: 0,
		uploaded: 0,
		failed: 0,
	};

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1
					className="text-xl font-bold tracking-wide"
					style={{ color: "var(--color-text-primary)" }}
				>
					剧集管理
				</h1>
				<p
					className="text-xs mt-1"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					浏览和管理已同步的视频和图片文件
				</p>
			</div>

			<EpisodeFolderList
				folders={folders}
				filter={filter}
				onFilterChange={(f) => {
					setFilter(f);
				}}
				counts={counts}
				isLoading={isLoading}
			/>
		</div>
	);
}
