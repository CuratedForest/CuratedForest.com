---
title: k3s on openSUSE Tumbleweed
weight: 10
type: docs
draft: false
---

First, run the following

```
sudo zypper addrepo https://rpm.rancher.io/k3s/stable/common/microos/noarch/ rancher-k3s
sudo zypper install -y nvtop k9s helm  container-selinux
sudo hostnamectl hostname gpu

# Sudo usage here might be off.
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC='server --cluster-init --write-kubeconfig-mode=600' sudo sh -

sudo cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
#echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> /root/.bashrc

# Not needed with CF
#helm install --namespace default  --set initialInstall=true base OwnYourIO/base
#helm upgrade --namespace default  --set initialInstall= base OwnYourIO/base

```
That gets you a basic ArgoCD. 


## Configure ArgoCD to work with SpencersLab
In an attempt to support good defaults as well as flexibility and customization, the domain, git repos, branches, and paths are all set with annotations on the cluster's ArgoCD secret (cluster-kubernetes.default.svc) and read by the appsets deploying the cluster. 

Install ArgoCD.
```
export CLUSTER_NAME=proxy-local; export NAMESPACE=default

kubectl apply -n default -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to come online.
kubectl wait --namespace $NAMESPACE --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-application-controller --timeout=120s
kubectl wait --namespace $NAMESPACE --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-repo-server --timeout=120s

echo y | kubectl exec -i svc/argocd-server --namespace $NAMESPACE -- argocd login 'localhost:8080'  --username=admin --password=$(kubectl exec svc/argocd-server -- argocd admin initial-password | head -n 1) --insecure

kubectl exec svc/argocd-server --namespace $NAMESPACE -- argocd cluster set in-cluster --name $CLUSTER_NAME

kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'stage=prod'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'chart.repo=https://ownyourio.github.io/SpencersLab/'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'chart.repo.path=charts'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'services.repo=https://github.com/OwnYourIO/SpencersLab.git'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'services.repo.path=services'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'values.repo=https://github.com/OwnYourIO/SpencersLab.git'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'values.path=custom-values'

kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'domain=spencerslab.com'
kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster "clusterName=$CLUSTER_NAME"

kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster "services.${CLUSTER_NAME}.customValuesUrls=[\"https://raw.githubusercontent.com/OwnYourIO/SpencersLab/refs/heads/main/custom-values/${CLUSTER_NAME}/prod-values.yaml\"]"

kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster "services.$CLUSTER_NAME.includeBase=true"
kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster "services.$CLUSTER_NAME.selfHeal=false"

```

Then we have to make some adjustments to allow ArgoCD to take over k8s objects it didn't deploy. 
```
kubectl patch deployment argocd-repo-server -n $NAMESPACE --type=json -p="[{ \"op\": \"add\", \"path\": \"/spec/template/metadata/labels/app.kubernetes.io~1instance\", \"value\": \"$CLUSTER_NAME\" }]"
kubectl patch deployment argocd-server -n $NAMESPACE --type=json -p="[{ \"op\": \"add\", \"path\": \"/spec/template/metadata/labels/app.kubernetes.io~1instance\", \"value\": \"$CLUSTER_NAME\" }]"
kubectl create clusterrolebinding -n $NAMESPACE argocd-application-controller-applicationsets  --clusterrole=cluster-admin --serviceaccount=default:argocd-application-controller

kubectl patch clusterrole argocd-server --type='json' -p='[{"op": "add", "path": "/rules/0", "value":{ "apiGroups": ["argoproj.io"], "resources": ["applicationsets"], "verbs": ["create","patch"]}}]'

# May also have to patch the argocd-repo-server port in order to get sync to work
kubectl patch service argocd-repo-server -n $NAMESPACE --type=json -p='[{
  "op": "replace",
  "path": "/spec/ports/0/targetPort",
  "value": 8081
}]'

```

For Curated Forest, I've been using
``` 
curl -sL https://github.com/OwnYourIO/SpencersLab/raw/refs/heads/main/services/${CLUSTER_NAME}/prod/templates/appset.yaml | sed 's/{{ `{{/{{/g; s/}}` }}/}}/g' | sed 's/values: {{.*}}/values: {}/g' | kubectl apply -n $NAMESPACE -f -

```
Had to sync the -charts-appset by hand. That has the dependencies for the core services. Might need to use sync wave to run it first?
```
kubectl exec -i svc/argocd-server --namespace ${NAMESPACE} -- argocd app sync $CLUSTER_NAME --resource argoproj.io:ApplicationSet:${CLUSTER_NAME}-charts-appset
kubectl exec -i svc/argocd-server --namespace ${NAMESPACE} -- argocd app sync ${CLUSTER_NAME}-external-secrets-bitwarden

kubectl exec -i svc/argocd-server --namespace ${NAMESPACE} -- argocd app sync $CLUSTER_NAME 

kubectl exec -i svc/argocd-server --namespace default -- argocd app sync $CLUSTER_NAME --resource apps:Deployment:argocd-applicationset-controller --resource apps:Deployment:argocd-server --resource apps:Deployment:argocd-repo-server --resource apps:StatefulSet:argocd-application-controller --force --replace

# Might also need
kubectl exec -i svc/argocd-server --namespace ${NAMESPACE} -- argocd app sync $CLUSTER_NAME --resource argoproj.io:ApplicationSet:${CLUSTER_NAME}-appset
```


This probably isn't necessary. Need to test.
```
# This is needed to access the argocd ui. After deploying appset.
kubectl set env deployment/argocd-server -n $NAMESPACE ARGOCD_SERVER_INSECURE=true

```




Then to add your bitwarden credentials, if an empty secret doesn't already exist, create it.

```
kubectl create secret generic bitwarden-cli 
k9s -c secrets
```
Then find the bitwarden-cli secret and press `e` to edit it. From here, add stringData at the root indentation:
![ArgoCD secret stringData example](argocd-bitwarden-secret.png)
Save this and it'll automatically get converted to `data:` which is base64 encoded.
If you're copying from another cluster, you can copy the data: section straight in.

You'll need to restart the bitwarden-cli pod first. Once that comes online restart the monitoring-external-secrets-bitwarden to trigger the ExternalSecrets to sync. 



#### Deprecated!
For use with helm and the base app.
```
NAMESPACE=default

echo y | kubectl exec -i svc/base-argocd-server --namespace default -- argocd login 'localhost:8080'  --username=admin --password=$(kubectl exec svc/base-argocd-server -- argocd admin initial-password | head -n 1) --insecure

#$(hostname might not be working right.)
kubectl exec svc/base-argocd-server --namespace $NAMESPACE -- argocd cluster set in-cluster --name $(hostname)
kubectl patch clusterrole argocd-server --type='json' -p='[{"op": "add", "path": "/rules/0", "value":{ "apiGroups": ["argoproj.io"], "resources": ["applicationsets"], "verbs": ["create","patch"]}}]'

kubectl create clusterrolebinding argocd-application-controller-admin \ --clusterrole=cluster-admin \ --serviceaccount=default:argocd-application-controller

# WRONG
services.grow.customValuesUrls: |
  - "https://raw.githubusercontent.com/OwnYourIO/SpencersLab/refs/heads/main/custom-values/grow/prod-values.yaml"
```


```
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'stage=prod'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'chart.repo=https://ownyourio.github.io/SpencersLab/'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'chart.repo.path=charts'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'services.repo=https://github.com/OwnYourIO/SpencersLab.git'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'services.repo.path=services'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'values.repo=https://github.com/OwnYourIO/SpencersLab.git'
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'values.repo.path=custom-values'
# This one is the actually used version of the above. Which is in Iac?
kubectl annotate secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'values.path=custom-values'
kubectl patch clusterrole base-argocd-server --type='json' -p='[{"op": "add", "path": "/rules/0", "value":{ "apiGroups": ["argoproj.io"], "resources": ["applicationsets"], "verbs": ["create","patch"]}}]'
kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'domain=spencerslab.com'
kubectl annotate --overwrite secret --namespace $NAMESPACE -l argocd.argoproj.io/secret-type=cluster 'clusterName=gpu'

```

Now we can deploy the appset.
```

kubectl exec svc/base-argocd-server --namespace default -- argocd appset create https://raw.githubusercontent.com/OwnYourIO/SpencersLab/refs/heads/main/services/gpu/appset.yaml

```



