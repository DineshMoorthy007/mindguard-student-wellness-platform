from app.ml.pipelines.train_depression import train_risk_model

if __name__ == "__main__":
    # Execute the primary tree-based risk model training pipeline
    train_risk_model(data_path="datasets/raw/student_depression")
