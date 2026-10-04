plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val mobileApiBaseUrl = providers.gradleProperty("mobileApiBaseUrl")
    .orElse("http://10.0.2.2:3000")
    .get()

android {
    namespace = "com.resiliner.dds"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.resiliner.dds"
        minSdk = 24
        targetSdk = 34
        versionCode = 7
        versionName = "1.3.0"

        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"https://rkpjjwapbjommuhphscx.supabase.co\""
        )
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"sb_publishable_tL_O5hLyhYcfzXlmuPzWFQ_rAsWDIzb\""
        )
        buildConfigField(
            "String",
            "MOBILE_API_BASE_URL",
            "\"$mobileApiBaseUrl\""
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.cardview:cardview:1.0.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
