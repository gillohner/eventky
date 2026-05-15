import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";

async function proxy(req: NextRequest, path: string[]) {
  const upstream = new URL(`${config.gateway.url}/${path.join("/")}`);
  upstream.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstreamRes = await fetch(upstream, {
    method,
    headers,
    body,
  });

  const resHeaders = new Headers(upstreamRes.headers);
  resHeaders.delete("content-encoding");
  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await params).path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await params).path);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await params).path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await params).path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await params).path);
}
