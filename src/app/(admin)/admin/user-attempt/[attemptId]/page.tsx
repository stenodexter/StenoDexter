// ─── app/user/attempt/[attemptId]/page.tsx ───────────────────────────────────
import { HydrateClient, api } from "~/trpc/server";
import AttemptResultClient from "../../../../../components/common/attemp-result-client";


interface Props {
  params: { attemptId: string };
}

export default async function AttemptResultPage({ params }: Props) {
  void api.result.getResult.prefetch({ attemptId: params.attemptId });

  return (
    <HydrateClient>
      <AttemptResultClient attemptId={params.attemptId} />
    </HydrateClient>
  );
}