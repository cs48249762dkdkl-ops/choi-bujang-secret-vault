export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Allow', 'POST');

  if (request.method !== 'POST') {
    return response.status(405).json({
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  return response.status(503).json({
    restored: false,
    status: 'BLOCKED',
    reason: 'S10_BACKUP_UNVERIFIED'
  });
}
