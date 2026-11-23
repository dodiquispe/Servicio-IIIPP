import { createError, defineEventHandler, getHeader, readRawBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const { previewGraphqlUpstream, previewGraphqlBypass } = useRuntimeConfig(event);
  if (!previewGraphqlUpstream || !previewGraphqlBypass) {
    throw createError({ statusCode: 404 });
  }

  const contentType = getHeader(event, "content-type");
  if (contentType?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    throw createError({ statusCode: 415 });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "x-vercel-protection-bypass": previewGraphqlBypass,
  });
  const authorization = getHeader(event, "authorization");
  if (authorization) headers.set("Authorization", authorization);

  let response: Response;
  try {
    response = await fetch(previewGraphqlUpstream, {
      method: "POST",
      headers,
      body: await readRawBody(event),
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw createError({ statusCode: 502, statusMessage: "GraphQL Preview no disponible" });
  }

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw createError({ statusCode: 502, statusMessage: "Respuesta no válida de GraphQL Preview" });
  }
  setResponseStatus(event, response.status);
  return response.json();
});
