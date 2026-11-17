export interface GraphqlRequest {
  query: string;
  variables?: Record<string, unknown>;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export function createService(
  endpoint: string,
  getAccessToken: () => string | null | undefined = () => null,
  onUnauthorized: () => void = () => undefined,
) {
  return {
    async graphql<T extends Record<string, unknown> = Record<string, unknown>>(
      request: GraphqlRequest,
    ): Promise<T> {
      const accessToken = getAccessToken();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(request),
      });
      const result = (await response.json()) as GraphqlResponse<T>;

      if (result.errors?.length) {
        const message = result.errors.map((error) => error.message).join("; ");
        if (/unauthorized|no autorizado|cuenta.{0,20}inactiva|sesi[oó]n.{0,20}(inv[aá]lida|expir[oó])/i.test(message)) {
          onUnauthorized();
        }
        throw new Error(message);
      }

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}: ${response.statusText || "falló la solicitud GraphQL"}`,
        );
      }

      if (!result.data) {
        throw new Error("La respuesta GraphQL no contiene datos");
      }

      return result.data;
    },
  };
}
