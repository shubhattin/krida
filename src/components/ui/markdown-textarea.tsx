import type * as React from "react";
import { type ReactNode, useCallback, useRef } from "react";
import { cn } from "~/lib/utils";

/**
 * A textarea with live markdown syntax highlighting rendered behind it
 * ("shadow textarea" technique): a transparent `<textarea>` sits on top of
 * a highlighted `<pre>` that mirrors its content, so what you type is colored
 * in real time. Zero external highlighting deps — a tiny tokenizer colors the
 * constructs that matter for video plans and system prompts (headings, bold,
 * the `**Label:**` shape, bullets, emphasis, inline code, horizontal rules).
 *
 * The textarea and the pre share identical typography/padding/white-space so
 * the colored layer lines up perfectly with the caret; scroll is mirrored.
 */
function MarkdownHighlight({
	text,
	tone,
}: {
	text: string;
	tone: MarkdownTone;
}): ReactNode {
	const lines = text.split("\n");
	return (
		<>
			{lines.map((line, index) => (
				<span key={index} className="block min-h-[1em] whitespace-pre-wrap">
					{highlightLine(line, tone)}
					{/* keep empty lines visible & match textarea row height */}
					{line === "" ? "\u200b" : null}
				</span>
			))}
			{/* trailing newline spacer so the last line scrolls into view */}
			{"\u200b"}
		</>
	);
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d+\.)\s+(.*)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;

/**
 * "contrast" (default): plain text and markers render in the normal foreground
 * color (white in dark mode / black in light), with emphasis carried by
 * weight, italic, and mono instead of graying.
 * "muted": syntax tokens are grayed so structure reads subtly.
 */
type MarkdownTone = "muted" | "contrast";

function highlightLine(line: string, tone: MarkdownTone): ReactNode {
	const markerColor =
		tone === "contrast" ? "text-foreground" : "text-muted-foreground";
	const headingMatch = HEADING_RE.exec(line);
	if (headingMatch) {
		const [, marks, rest] = headingMatch;
		return (
			<span>
				<span className="text-primary font-semibold">{marks}</span>
				<span className={markerColor}> </span>
				<span className="text-foreground font-semibold">
					{highlightInline(rest, tone)}
				</span>
			</span>
		);
	}

	const hrMatch = HR_RE.exec(line.trim());
	if (hrMatch) {
		return (
			<span
				className={
					tone === "contrast"
						? "text-foreground/60"
						: "text-muted-foreground/60"
				}
			>
				{line}
			</span>
		);
	}

	const bulletMatch = BULLET_RE.exec(line);
	if (bulletMatch) {
		const [, indent, marker, rest] = bulletMatch;
		return (
			<span>
				{indent}
				<span className={markerColor}>{marker}</span>
				<span className={markerColor}> </span>
				{highlightInline(rest, tone)}
			</span>
		);
	}

	const orderedMatch = ORDERED_RE.exec(line);
	if (orderedMatch) {
		const [, indent, marker, rest] = orderedMatch;
		return (
			<span>
				{indent}
				<span className={markerColor}>{marker}</span>
				<span className={markerColor}> </span>
				{highlightInline(rest, tone)}
			</span>
		);
	}

	return highlightInline(line, tone);
}

// Inline token regexes, tried at the current scan position.
const INLINE_BOLD = /^\*\*([^*]+?)\*\*/;
const INLINE_CODE = /^`([^`]+?)`/;
const INLINE_EM = /^(\*|_)([^*_\n]+?)\1/;

function highlightInline(text: string, tone: MarkdownTone): ReactNode {
	if (!text) return null;
	const nodes: ReactNode[] = [];
	let remaining = text;
	let key = 0;
	const mutedEmphasis =
		tone === "contrast" ? "text-foreground" : "text-muted-foreground";

	while (remaining.length > 0) {
		const bold = INLINE_BOLD.exec(remaining);
		const code = INLINE_CODE.exec(remaining);
		const em = INLINE_EM.exec(remaining);

		// pick the earliest match
		const candidates = [
			{ kind: "bold" as const, m: bold },
			{ kind: "code" as const, m: code },
			{ kind: "em" as const, m: em },
		].filter((c) => c.m);

		if (candidates.length === 0) {
			nodes.push(remaining);
			break;
		}

		const earliest = candidates.reduce((best, cur) => {
			const bestIdx = best.m?.index ?? Infinity;
			const curIdx = cur.m?.index ?? Infinity;
			return curIdx < bestIdx ? cur : best;
		});

		const match = earliest.m!;
		const start = match.index ?? 0;
		if (start > 0) {
			nodes.push(remaining.slice(0, start));
		}

		if (earliest.kind === "bold") {
			const label = match[1] ?? "";
			const isLabel = /:\s*$/.test(label);
			nodes.push(
				<span
					key={key++}
					className={
						isLabel && tone !== "contrast"
							? "text-accent-foreground font-semibold"
							: "text-foreground font-semibold"
					}
				>
					**{label}**
				</span>,
			);
		} else if (earliest.kind === "code") {
			nodes.push(
				<span
					key={key++}
					className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
				>
					`{match[1] ?? ""}`
				</span>,
			);
		} else {
			nodes.push(
				<span key={key++} className={cn("italic", mutedEmphasis)}>
					{match[0]}
				</span>,
			);
		}

		remaining = remaining.slice(start + match[0].length);
	}

	return nodes;
}

function MarkdownTextarea({
	className,
	value,
	onChange,
	onScroll,
	tone = "contrast",
	...props
}: React.ComponentProps<"textarea"> & { tone?: MarkdownTone }) {
	const preRef = useRef<HTMLPreElement>(null);

	const handleScroll = useCallback(
		(event: React.UIEvent<HTMLTextAreaElement>) => {
			const pre = preRef.current;
			if (pre) {
				pre.scrollTop = event.currentTarget.scrollTop;
				pre.scrollLeft = event.currentTarget.scrollLeft;
			}
			onScroll?.(event);
		},
		[onScroll],
	);

	return (
		<div className="relative isolate">
			{/* highlighted backdrop — must mirror the textarea's box & typography.
			    The textarea (below) drives sizing & scroll; the pre just paints. */}
			<pre
				ref={preRef}
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap border border-transparent px-2.5 py-2 font-mono text-sm leading-relaxed",
					tone === "contrast" ? "text-foreground" : "text-muted-foreground",
				)}
			>
				<MarkdownHighlight
					text={typeof value === "string" ? value : String(value ?? "")}
					tone={tone}
				/>
			</pre>
			<textarea
				data-slot="textarea"
				value={value}
				onChange={onChange}
				onScroll={handleScroll}
				spellCheck={false}
				className={cn(
					"relative w-full rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-sm leading-relaxed text-transparent caret-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

export { MarkdownTextarea };
