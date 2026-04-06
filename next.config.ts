import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "kappa.lol" },
			{ protocol: "https", hostname: "*.kappa.lol" },
			{ protocol: "https", hostname: "fivemanage.com" },
			{ protocol: "https", hostname: "*.fivemanage.com" },
			{ protocol: "https", hostname: "fivemanager.net" },
			{ protocol: "https", hostname: "*.fivemanager.net" },
			{ protocol: "https", hostname: "fivemanager.com" },
			{ protocol: "https", hostname: "*.fivemanager.com" },
		],
	},
};

export default nextConfig;
