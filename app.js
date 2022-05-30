let accounts = [];
let contractCompiled, abiContract;

document.getElementById("compiled-contract").addEventListener('change', (event) => {
    const fileList = event.target.files;
    var fr = new FileReader();
    fr.onload=function(){
        contractCompiled = fr.result;
    }   
    fr.readAsText(fileList[0]);
});

document.getElementById("abi-contract").addEventListener('change', (event) => {
    const fileList = event.target.files;
    var fr = new FileReader();
    fr.onload=function(){
        abiContract = JSON.parse(fr.result);
    }   
    fr.readAsText(fileList[0]);
});

const loadToastr = () => {
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-center",
        "preventDuplicates": true,
        "showDuration": "500",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };
};

const isMetaMaskInstalled = () => {
    const { ethereum } = window;
    return Boolean(ethereum && ethereum.isMetaMask);
};

const checkMetamaskConnection = (web3) => {
    let callback = async () => {
        accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    };
    if (isMetaMaskInstalled()) {
        web3.eth.getAccounts(async function (error, accounts) {
            if (error != null) {
                toastr.warning('An error occurred while trying to connect to MetaMask:<br>' + error);
            }
            else if (accounts.length == 0) {
                await connectMetamask(ethereum, callback);
            }
            else {
                await callback();
                refreshPage();
            }
        });
    }
    else {
        console.log("MetaMask is not installed");
    }
};

const connectMetamask = async (ethereum, callback) => {
    ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((a) => {
            accounts = a;
            toastr.success('Account ' + a[0] + ' was connected');
            if (typeof callback === "function") {
                callback();
            }
        })
        .catch((err) => {
            if (err.code == 4001) {
                toastr.error('Connection to MetaMask failed: <br>' + err.message);
            }
            else if (err.code == -32002) {
                toastr.warning('An active connection to MetaMask is already pending, please check your MetaMask notifications.');
            }
            else {
                console.error(err);
                toastr.error('An error occurred while trying to connect: <br>' + err.message);
            }
        });
};

const createContract = (web3) => {
    let activeAccount = accounts[0];
    let contract = new web3.eth.Contract(abiContract, activeAccount);
    let deploy = contract.deploy({ data: contractCompiled });
    let contractInfo = $('.contract-info');
    toastr.info('Sending transaction to MetaMask...');
    contractInfo.prop("disabled", true);
    deploy
        .send({ from: activeAccount})
        .on("transactionHash", (function (transaction) {
            console.log("trans: " + transaction);
            toastr.info('Transaction sent to MetaMask...');
        }))
        .on('error', function (error) {
            console.log(error);
            toastr.error('Transaction failed.<br> ' + error.message);
            contractInfo.prop("disabled", false);
        }).on("receipt", (function (t) {
            let tokenAddress = t.contractAddress;
            $(".contract-hash").val(tokenAddress);
            $(".contract-address-div").show();
            toastr.success('Contract was deployed successfully!');
        }));
};

const refreshPage = () => {
    let isLoggedIn = accounts.length > 0;
    let loggedOut = $(".logged-out");
    let loggedIn = $(".logged-in");
    if(isLoggedIn){
        loggedOut.hide();
        loggedIn.show();
    }
    else {
        loggedOut.show();
        loggedIn.hide();
    }
};

$(".copy-contract-address").click(function () {
    let dataLink = $(this).data("contract");
    let contractDiv = $(this);
    if (dataLink) {
        contractDiv = $(dataLink);
    }
    let showCopyTooltip = null;
    let copiedTooltip = new bootstrap.Tooltip(contractDiv, {
        title: "Copied!",
        trigger: "manual",
        placement: "bottom"
    });
    copiedTooltip.show();
    clearTimeout(showCopyTooltip);
    showCopyTooltip = setTimeout(() => {
        copiedTooltip.hide();
    }, 1000);
    contractDiv.select();
    document.execCommand("copy");
    document.getSelection().removeAllRanges();
});

const startApp = async () => {
    const { ethereum } = window;
    const web3 = new Web3(window.ethereum);
    ethereum.on('accountsChanged', function (acc) {
        accounts = acc;
        refreshPage();
    });
    $('#btn-metamask-connect').click(function () {
        checkMetamaskConnection(web3);
    });
    $('#btn-token-deploy').click(function () {
        createContract(web3);
    });
    loadToastr();
    refreshPage();
};

startApp();