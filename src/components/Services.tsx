"use client";

import React from 'react';
import styles from './Services.module.css';

const Services: React.FC = () => {
    return (
        <section className={styles.servicesSection}>
            <h1 className={styles.header}>Our Services</h1>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={`${styles.face} ${styles.face1}`}>
                        <div className={styles.content}>
                            <p>Advanced neural network architectures for complex pattern recognition, image processing, and natural language understanding. Harness the power of deep neural networks for your most challenging AI tasks.</p>
                        </div>
                    </div>

                    <div className={`${styles.face} ${styles.face2}`}>
                        <h2>Deep Learning</h2>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={`${styles.face} ${styles.face1}`}>
                        <div className={styles.content}>
                            <p>Custom ML solutions for predictive analytics, classification, and regression problems. From traditional algorithms to modern approaches, we help you build intelligent systems that learn and adapt.</p>
                        </div>
                    </div>

                    <div className={`${styles.face} ${styles.face2}`}>
                        <h2>Machine Learning</h2>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={`${styles.face} ${styles.face1}`}>
                        <div className={styles.content}>
                            <p>Specialized neural network implementations for complex data processing tasks. Design and deploy custom neural architectures optimized for your specific use cases and performance requirements.</p>
                        </div>
                    </div>

                    <div className={`${styles.face} ${styles.face2}`}>
                        <h2>Neural Networks</h2>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={`${styles.face} ${styles.face1}`}>
                        <div className={styles.content}>
                            <p>Comprehensive data analysis and visualization services. Transform raw data into actionable insights using advanced statistical methods and modern analytical tools.</p>
                        </div>
                    </div>

                    <div className={`${styles.face} ${styles.face2}`}>
                        <h2>Data Analysis</h2>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Services; 