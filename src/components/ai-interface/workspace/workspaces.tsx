import Workspace from "./workspace";

export default function Workspaces({
	workspaces,
	isMobile,
}: {
	workspaces: { id: string; name: string }[];
	isMobile: boolean;
}) {
	return (
		<>
			{workspaces.map(({ id, name }) => (
				<Workspace key={id} id={id} name={name} isMobile={isMobile} />
			))}
		</>
	);
}
