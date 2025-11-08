/**
 * GitHub API Service
 * Fetches public GitHub user data and repositories
 * No authentication required for public data
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  company: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  html_url: string;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  homepage: string | null;
  archived: boolean;
  fork: boolean;
}

export interface RepoLanguages {
  [language: string]: number;
}

export interface GitHubData {
  user: GitHubUser;
  repositories: GitHubRepo[];
  repoLanguages: Map<string, RepoLanguages>; // Map of repo full_name to languages
}

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Fetch GitHub user profile
 */
async function fetchGitHubUser(username: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Quantum-Teammate-Search",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`GitHub user "${username}" not found`);
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch user's public repositories
 */
async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore && page <= 10) {
    // Limit to 10 pages (1000 repos max)
    const response = await fetch(
      `${GITHUB_API_BASE}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Quantum-Teammate-Search",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const pageRepos: GitHubRepo[] = await response.json();
    repos.push(...pageRepos);

    // Check if there are more pages
    hasMore = pageRepos.length === perPage;
    page++;
  }

  return repos.filter((repo) => !repo.archived && !repo.fork); // Filter out archived and forked repos
}

/**
 * Fetch languages for a repository
 */
async function fetchRepoLanguages(
  owner: string,
  repo: string
): Promise<RepoLanguages> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Quantum-Teammate-Search",
        },
      }
    );

    if (!response.ok) {
      // If we can't fetch languages, return empty object (non-critical)
      return {};
    }

    return response.json();
  } catch (error) {
    // Non-critical error, return empty object
    console.warn(`Failed to fetch languages for ${owner}/${repo}:`, error);
    return {};
  }
}

/**
 * Fetch languages for multiple repositories (with rate limiting consideration)
 * Only fetch for top repos to avoid hitting rate limits
 */
async function fetchReposLanguages(
  repos: GitHubRepo[],
  maxRepos: number = 20
): Promise<Map<string, RepoLanguages>> {
  const languagesMap = new Map<string, RepoLanguages>();

  // Only fetch languages for top repos (by stars and recency)
  const topRepos = repos
    .sort((a, b) => {
      // Sort by stars first, then by recency
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    })
    .slice(0, maxRepos);

  // Fetch languages in parallel with a small delay to respect rate limits
  const promises = topRepos.map(async (repo, index) => {
    // Add small delay to avoid hitting rate limits too quickly
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const [owner] = repo.full_name.split("/");
    const languages = await fetchRepoLanguages(owner, repo.name);
    languagesMap.set(repo.full_name, languages);
  });

  await Promise.all(promises);

  return languagesMap;
}

/**
 * Main function to fetch all GitHub data for a user
 */
export async function fetchGitHubData(username: string): Promise<GitHubData> {
  // Validate username format
  if (!username || !/^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$/.test(username)) {
    throw new Error("Invalid GitHub username format");
  }

  // Fetch user and repos in parallel
  const [user, repositories] = await Promise.all([
    fetchGitHubUser(username),
    fetchUserRepos(username),
  ]);

  // Fetch languages for top repositories
  const repoLanguages = await fetchReposLanguages(repositories, 20);

  return {
    user,
    repositories,
    repoLanguages,
  };
}

