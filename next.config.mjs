/** @type {import('next').NextConfig} */
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const isGithubPages = process.env.GITHUB_ACTIONS === "true";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGithubPages && repository ? `/${repository}` : "",
  assetPrefix: isGithubPages && repository ? `/${repository}/` : undefined,
};

export default nextConfig;
