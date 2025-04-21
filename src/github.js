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
    // First, check if the notes directory exists
    try {
      await octokit.repos.getContent({ owner, repo, path });
    } catch (error) {
      if (error.status === 404) {
        return []; // Notes directory doesn't exist yet
      }
      throw error;
    }

    // Get all directories in the notes folder
    const response = await octokit.repos.getContent({ owner, repo, path });
    
    if (!Array.isArray(response.data)) {
      return [];
    }
    
    // Filter to only show directories
    const directories = response.data.filter(item => item.type === 'dir');
    
    // For each directory, check if it contains a markdown.md file
    const validNotes = await Promise.all(
      directories.map(async (dir) => {
        try {
          const dirPath = `${path}/${dir.name}`;
          const dirContent = await octokit.repos.getContent({
            owner,
            repo,
            path: dirPath
          });
          
          if (Array.isArray(dirContent.data)) {
            const hasMarkdown = dirContent.data.some(
              file => file.name === 'markdown.md' && file.type === 'file'
            );
            
            if (hasMarkdown) {
              return {
                name: dir.name,
                path: dir.path
              };
            }
          }
          return null;
        } catch (error) {
          if (error.status === 404) {
            return null; // Directory doesn't exist or is empty
          }
          console.error(`Error checking directory ${dir.name}:`, error);
          return null;
        }
      })
    );
    // Filter out null values and return valid notes
    return validNotes.filter(note => note !== null);
  } catch (error) {
    console.error('Error getting files:', error);
    if (error.status === 404) {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}

export async function getFileContent(owner, repo, path) {
  const octokit = getOctokit();
  const response = await octokit.repos.getContent({ owner, repo, path });
  
  // Check if the file is an image
  const isImage = !path.endsWith('.md');
  const content = isImage ? response.data.content : atob(response.data.content);
  return { content, sha: response.data.sha, isImage };
}

export async function saveFile(owner, repo, path, content, sha = null, message = 'Update file') {
  try {
    const octokit = new Octokit({
      auth: localStorage.getItem('github_token')
    });

    // Convert content to base64 if it's not already
    const base64Content = content.startsWith('data:') ? content.split(',')[1] : btoa(content);

    // Try to save the file directly
    const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      message,
      content: base64Content,
      sha: sha || undefined // Only include sha if it's not null
    });

    return response.data;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}