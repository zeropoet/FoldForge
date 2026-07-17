/** @type {import('next').NextConfig} */
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const isGithubPages = process.env.GITHUB_ACTIONS === "true";
const hasCustomDomain = Boolean(process.env.CUSTOM_DOMAIN);
const repositoryPath = isGithubPages && repository && !hasCustomDomain ? `/${repository}` : "";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: repositoryPath,
  assetPrefix: repositoryPath ? `${repositoryPath}/` : undefined,
};

export default nextConfig;
