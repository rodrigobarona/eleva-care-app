-- SQL to insert main categories and subcategories based on services section in locales

-- First, let's add a parentId column to the categories table if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "parentId" UUID REFERENCES categories(id);

-- Main categories
DO $$
DECLARE
    pregnancy_id UUID;
    pelvic_id UUID;
    lifecycle_id UUID;
    cancer_id UUID;
BEGIN
    -- Insert main categories and store their IDs
    INSERT INTO categories (id, name, description, image, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Pregnancy & Postpartum', 'Comprehensive care to support women through the transformative journey of pregnancy and early motherhood.', '/img/Pregnant-Woman-Flowers.jpg', NOW(), NOW())
    RETURNING id INTO pregnancy_id;
    
    INSERT INTO categories (id, name, description, image, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Pelvic Health', 'Specialized care addressing the unique pelvic health needs of women throughout their lives.', '/img/Woman-Working-Out-Living-Room.jpg', NOW(), NOW())
    RETURNING id INTO pelvic_id;
    
    INSERT INTO categories (id, name, description, image, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Through Every Stage', 'Holistic support for women''s health concerns from adolescence through menopause and beyond.', '/img/Smiling-Women-Photo.jpg', NOW(), NOW())
    RETURNING id INTO lifecycle_id;
    
    INSERT INTO categories (id, name, description, image, "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Empowering Your Cancer Journey', 'Specialized support for women facing breast and gynecological cancers, providing comprehensive care from diagnosis through survivorship.', '/img/cancer-journey.jpg', NOW(), NOW())
    RETURNING id INTO cancer_id;

    -- Subcategories for Pregnancy & Postpartum with parentId reference
    INSERT INTO categories (id, name, description, image, "parentId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Pregnancy Physical Therapy', 'Prepare for birth, manage pain, regain strength, address diastasis recti, and receive targeted pelvic floor interventions.', NULL, pregnancy_id, NOW(), NOW()),
      (gen_random_uuid(), 'OB/GYN Care', 'Expert care throughout your pregnancy journey and postpartum recovery.', NULL, pregnancy_id, NOW(), NOW()),
      (gen_random_uuid(), 'Pregnancy Nutritional Guidance', 'Optimize your diet for a healthy pregnancy and postpartum journey.', NULL, pregnancy_id, NOW(), NOW()),
      (gen_random_uuid(), 'Pregnancy & Postpartum Mental Health', 'Navigate the emotional and mental challenges of motherhood with compassionate guidance.', NULL, pregnancy_id, NOW(), NOW()),
      (gen_random_uuid(), 'Pregnancy & Postpartum Exercise', 'Therapeutic exercise during pregnancy and postpartum, designed to support your changing body.', NULL, pregnancy_id, NOW(), NOW());

    -- Subcategories for Pelvic Health with parentId reference
    INSERT INTO categories (id, name, description, image, "parentId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Pelvic Physical Therapy', 'Specialized treatment for incontinence, pelvic organ prolapse, and pelvic pain, including pain during intercourse.', NULL, pelvic_id, NOW(), NOW()),
      (gen_random_uuid(), 'Specialized OB/GYN Care', 'Expert diagnosis and treatment for pelvic health issues, including prolapse, endometriosis, and sexual dysfunction.', NULL, pelvic_id, NOW(), NOW()),
      (gen_random_uuid(), 'Pelvic Health Mental Support', 'Counseling and therapy to address the psychological aspects of pelvic health concerns.', NULL, pelvic_id, NOW(), NOW());

    -- Subcategories for Through Every Stage with parentId reference
    INSERT INTO categories (id, name, description, image, "parentId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Teen Health', 'Navigate puberty, menstruation, and early womanhood with confidence and support.', NULL, lifecycle_id, NOW(), NOW()),
      (gen_random_uuid(), 'Menopause Management', 'Address hormonal changes, manage symptoms, and prioritize your well-being.', NULL, lifecycle_id, NOW(), NOW()),
      (gen_random_uuid(), 'Mental Wellness', 'Access therapy and support to manage stress, anxiety, depression, and other mental health concerns.', NULL, lifecycle_id, NOW(), NOW()),
      (gen_random_uuid(), 'Fitness & Nutrition', 'Discover personalized exercise plans and nutritional guidance tailored to your individual needs.', NULL, lifecycle_id, NOW(), NOW()),
      (gen_random_uuid(), 'General Physical Therapy', 'Manage pain, prevent injury, and optimize physical performance, with specialized expertise for active women.', NULL, lifecycle_id, NOW(), NOW());

    -- Subcategories for Empowering Your Cancer Journey with parentId reference
    INSERT INTO categories (id, name, description, image, "parentId", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), 'Cancer Physical Therapy', 'Optimize recovery with pre-surgical preparation, post-treatment rehabilitation, and targeted exercise programs.', NULL, cancer_id, NOW(), NOW()),
      (gen_random_uuid(), 'Cancer Pain Management', 'Evidence-based techniques for managing treatment-related pain and scar tissue management.', NULL, cancer_id, NOW(), NOW()),
      (gen_random_uuid(), 'Cancer Exercise Support', 'Personalized exercise prescriptions that adapt to your treatment phase, helping maintain strength and manage fatigue.', NULL, cancer_id, NOW(), NOW()),
      (gen_random_uuid(), 'Cancer Mental Health Care', 'Navigate the emotional challenges of diagnosis and treatment with professional support.', NULL, cancer_id, NOW(), NOW()),
      (gen_random_uuid(), 'Lymphedema Care', 'Specialized prevention strategies and treatment including manual lymphatic drainage and compression therapy.', NULL, cancer_id, NOW(), NOW());
END $$; 