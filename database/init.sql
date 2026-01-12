-- OpenJourney 数据库初始化脚本

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS openjourney CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE openjourney;

-- 生成的图片表
CREATE TABLE IF NOT EXISTS generated_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    prompt TEXT NOT NULL,
    file_size BIGINT,
    width INT,
    height INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
);

-- 生成的视频表
CREATE TABLE IF NOT EXISTS generated_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    prompt TEXT NOT NULL,
    file_size BIGINT,
    duration DECIMAL(10,2),
    width INT,
    height INT,
    fps DECIMAL(5,2),
    source_image_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_image_id) REFERENCES generated_images(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_source_image (source_image_id)
);