import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";

/**
 * Auth pages (login / signup) reuse the exact same ambient background as the
 * landing page, so the visual theme feels seamless across the whole site.
 */
const AuthSceneBackground: React.FC = () => <SiteAmbientBackground />;

export default AuthSceneBackground;
