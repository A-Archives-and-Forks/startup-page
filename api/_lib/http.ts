export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/** Error body shape matches FastAPI's {"detail": ...} so existing clients keep working. */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return json({ detail: err.message }, err.status);
  }
  console.error(err);
  return json({ detail: "Internal server error" }, 500);
}
