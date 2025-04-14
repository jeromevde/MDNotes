import { Octokit } from '@octokit/rest';

export function getOctokit() {
  const token = localStorage.getItem('github_token');
  if (!token) {
    throw new Error('GitHub token not set');
  }
  return new Octokit({ auth: token });
}

export async function getAuthenticatedUser() {
  const octokit = getOctokit();
  const response = await octokit.users.getAuthenticated();
  return response.data;
}

export async function getRepo(owner, repo) {
  const octokit = getOctokit();
  try {
    const response = await octokit.repos.get({ owner, repo });
    return response.data;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createRepo(name, privateRepo = true) {
  const octokit = getOctokit();
  const response = await octokit.repos.createForAuthenticatedUser({
    name,
    private: privateRepo,
  });
  return response.data;
}

export async function getFiles(owner, repo, path = 'notes') {
  const octokit = getOctokit();
  try {
    const response = await octokit.repos.getContent({ owner, repo, path });
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    if (error.status === 404) {
      return []; // Directory doesn’t exist yet
    }
    throw error;
  }
}

export async function getFileContent(owner, repo, path) {
  const octokit = getOctokit();
  const response = await octokit.repos.getContent({ owner, repo, path });
  const content = Buffer.from(response.data.content, 'base64').toString('utf8');
  return { content, sha: response.data.sha };
}

export async function saveFile(owner, repo, path, content, sha = null, message = 'Update note') {
  const octokit = getOctokit();
  const params = {
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) {
    params.sha = sha;
  }
  await octokit.repos.createOrUpdateFileContents(params);
}