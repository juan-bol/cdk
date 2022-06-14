Terraform vs CDK vs Pulumi

Terraform, unlike CDK, manages the its infrastructure state, it gets the data from each resource of the last deployed state and compares it with current infrastructure which migth has mannual changes. If so, Terraform would change it as desired in the code, CDK would not detect mannual changes as it only compares the last deployed Cloud Formation yml with current one. When working with a cloud account where role restrictions does not allow mannual changes this could not affect in nothing, regarding our side.

Terraform is a declarative language, CDK is also imperative, what would be the advantages?

Cases where changes implies destroy and create:
    - TMNA case -> increment root disk space

Data resources run at the beggining of the terraform plan

Assurant case -> The creation of some resources needs others to be already created and provisioned (another deployment step)

pulumi requieres the access keys as env vars, not enough with aws configured

CDK is just a wrapper around CloudFormation that enables us to write our infrastructure as code using a programming language (TypeScript, Python, Java ...), rather than a configuration language (yaml, json)

CDK adds default tags to resoures to track them on Cloud Formation Stack


Commands:

terraform init
terraform plan
terraform appply
terraform state list

cdk init --language python
cdk synth
cdk diff
cdk deploy

pulumi login
pulumi new aws-python
pulumi up
pulumi stack
pulumi stack output