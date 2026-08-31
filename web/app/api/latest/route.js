export const runtime = 'edge';

export async function GET() {
  const token = process.env.GITHUB_UPDATE_TOKEN;
  if (!token) return Response.json({ error: 'no token' }, { status: 500 });

  const res = await fetch(
    'https://api.github.com/repos/kitifica-max/cc-brew/releases/latest',
    { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'CC-Brew-Web' } }
  );

  if (!res.ok) return Response.json({ error: 'github error', status: res.status }, { status: 502 });

  const { tag_name, html_url } = await res.json();
  const version = tag_name?.replace(/^v/, '');

  return Response.json({ version, releaseUrl: html_url }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
