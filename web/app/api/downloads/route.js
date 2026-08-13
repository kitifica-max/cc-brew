import { NextResponse } from 'next/server';

export const revalidate = 300; // cache 5 min

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'cc-controller-landing',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const res = await fetch('https://api.github.com/repos/kitifica-max/cc-controller/releases', {
    headers,
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.statusText }, { status: res.status });
  }

  const releases = await res.json();
  const total = releases.reduce((sum, rel) =>
    sum + (rel.assets || []).reduce((s, a) => s + (a.download_count || 0), 0), 0);

  return NextResponse.json({ total }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
