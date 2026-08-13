import { NextResponse } from 'next/server';

const REPO = 'kitifica-max/cc-controller';

export const revalidate = 3600; // cache 1h

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    headers: { ...headers, 'User-Agent': 'cc-controller-landing' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ total: 0 });

  const releases = await res.json();
  if (!Array.isArray(releases)) return NextResponse.json({ total: 0 });

  const total = releases.reduce(
    (sum, rel) => sum + (rel.assets || []).reduce((s, a) => s + (a.download_count || 0), 0),
    0
  );

  return NextResponse.json({ total });
}
