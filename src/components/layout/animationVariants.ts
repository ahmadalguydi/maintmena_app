/**
 * Staggered list animation variants for card lists.
 * Use with motion.div to animate list items.
 * 
 * Example:
 * <motion.div variants={listVariants} initial="hidden" animate="show">
 *   {items.map(item => (
 *     <motion.div key={item.id} variants={itemVariants}>
 *       <Card />
 *     </motion.div>
 *   ))}
 * </motion.div>
 */
export const listVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.04,
        },
    },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
        }
    },
};

/**
 * Fade-in animation for individual components.
 */
export const fadeInVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: 0.15 }
    },
};

/**
 * Slide-up animation for cards and panels.
 */
export const slideUpVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
        }
    },
};
