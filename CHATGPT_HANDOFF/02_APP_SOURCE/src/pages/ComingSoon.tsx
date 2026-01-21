import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/divine_light_rays_bursting.png";
import communityImage from "@assets/generated_images/community_celebration_silhouettes.png";

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with Background Image */}
      <div className="relative h-screen flex items-center justify-center">
        {/* Background Image with Dark Wash */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Animated Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Something <span className="text-amber-400">Amazing</span>
              <br />Is Coming
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
              MinistryPath
            </p>

            {/* Description */}
            <p className="text-lg text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              We're building a powerful new platform to connect, equip, and empower 
              our church family. Get ready to discover your gifts, find your place, 
              and make an impact together!
            </p>

            {/* Animated Dots */}
            <div className="flex justify-center gap-3 mb-12">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-amber-400 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                { icon: "🎯", title: "Discover Your Gifts", desc: "Take our spiritual gifts assessment" },
                { icon: "📚", title: "Grow & Learn", desc: "Access training and resources" },
                { icon: "🤝", title: "Serve Together", desc: "Find your ministry team" }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20"
                >
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </div>

      {/* Second Section */}
      <div className="relative py-24 px-6">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${communityImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Under Construction
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
              Our team is working hard to bring you an incredible experience. 
              Stay tuned for updates as we prepare to launch!
            </p>

            {/* Progress Indicator */}
            <div className="max-w-md mx-auto mb-12">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>Building...</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  initial={{ width: "0%" }}
                  whileInView={{ width: "75%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-card border rounded-lg p-8 max-w-md mx-auto">
              <h3 className="font-semibold text-foreground mb-4">Garden City Church</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Assemblies of God • Beverly, MA
              </p>
              <a 
                href="mailto:info@gardencitychurch.net" 
                className="text-primary hover:underline text-sm"
                data-testid="link-email-contact"
              >
                info@gardencitychurch.net
              </a>
            </div>

            {/* Footer */}
            <p className="mt-16 text-sm text-muted-foreground">
              MinistryPath • Coming Soon
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
