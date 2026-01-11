"use client";

import { MindMapWorkspace } from "@/types/store.types";
import Workspace from "./workspace";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";

export default function Workspaces({
	workspaces,
	isMobile,
}: {
	workspaces: MindMapWorkspace[];
	isMobile: boolean;
}) {
	return (
		<AnimatedList className="items-start gap-1" delay={100}>
			{workspaces.map(({ id, title }) => (
				<AnimatedListItem key={id}>
					<Workspace id={id} title={title} isMobile={isMobile} />
				</AnimatedListItem>
			))}
		</AnimatedList>
	);
}
