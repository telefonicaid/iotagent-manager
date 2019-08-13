Summary: IoT Agent Manager
Name: iotagent-manager
Version: %{_product_version}
Release: %{_product_release}
License: AGPLv3
BuildRoot: %{_topdir}/BUILDROOT/
BuildArch: x86_64
# Requires: nodejs >= 0.10.24
Requires: logrotate
Requires(post): /sbin/chkconfig, /usr/sbin/useradd npm
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Group: Applications/Engineering
Vendor: Telefonica I+D

%description
The IoT Agent Manager works as a proxy for scenarios where multiple IoT
Agents offer different southbound protocols.

# System folders
%define _srcdir $RPM_BUILD_ROOT/../../..
%define _service_name iotamanager
%define _install_dir /opt/iotamanager
%define _iotamanager_log_dir /var/log/iotamanager
%define _iotamanager_pid_dir /var/run/iotamanager
%define _iotamanager_conf_dir /etc/iotamanager.d

%define _iotamanager_executable iota-manager

# RPM Building folder
%define _build_root_project %{buildroot}%{_install_dir}
# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
echo "[INFO] Preparing installation"
# Create rpm/BUILDROOT folder
/bin/rm -Rf $RPM_BUILD_ROOT && /bin/mkdir -p $RPM_BUILD_ROOT
[ -d %{_build_root_project} ] || /bin/mkdir -p %{_build_root_project}

# Copy src files
/bin/cp -R %{_srcdir}/lib \
      %{_srcdir}/bin \
      %{_srcdir}/config.js \
      %{_srcdir}/package.json \
      %{_srcdir}/LICENSE \
      %{_build_root_project}

[ -f %{_srcdir}/npm-shrinkwrap.json ] && /bin/cp %{_srcdir}/npm-shrinkwrap.json %{_build_root_project}

/bin/cp -R %{_topdir}/SOURCES/etc %{buildroot}

# -------------------------------------------------------------------------------------------- #
# Build section:
# -------------------------------------------------------------------------------------------- #
%build
echo "[INFO] Building RPM"
cd %{_build_root_project}

# Only production modules. We have found that --force is required to make this work for Node v8
/bin/rm -fR node_modules/
npm cache clear --force
npm install --production

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
echo "[INFO] Creating %{_project_user} user"
grep ^%{_project_user}: /etc/passwd
RET_VAL=$?
if [ "$RET_VAL" != "0" ]; then
      /usr/sbin/useradd -s "/bin/bash" -d %{_install_dir} %{_project_user}
      RET_VAL=$?
      if [ "$RET_VAL" != "0" ]; then
         echo "[ERROR] Unable create %{_project_user} user" \
         exit $RET_VAL
      fi
else
      /bin/mv %{_install_dir}/config.js /tmp
fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
echo "[INFO] Configuring application"
    echo "[INFO] Creating the home IoT Agent Manager directory"
    /bin/mkdir -p _install_dir
    echo "[INFO] Creating log & run directory"
    /bin/mkdir -p %{_iotamanager_log_dir}
    chown -R %{_project_user}:%{_project_user} %{_iotamanager_log_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_iotamanager_log_dir}
    setfacl -d -m g::rwx %{_iotamanager_log_dir}
    setfacl -d -m o::rx %{_iotamanager_log_dir}

    /bin/mkdir -p %{_iotamanager_pid_dir}
    chown -R %{_project_user}:%{_project_user} %{_iotamanager_pid_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_iotamanager_pid_dir}
    setfacl -d -m g::rwx %{_iotamanager_pid_dir}
    setfacl -d -m o::rx %{_iotamanager_pid_dir}

    echo "[INFO] Configuring application service"
    cd /etc/init.d
    chkconfig --add %{_service_name}

    # restores old configuration if any
    [ -f /tmp/config.js ] && /bin/mv /tmp/config.js %{_install_dir}/config.js
   
    # Chmod iota-manager binary
    chmod guo+x %{_install_dir}/bin/%{_iotamanager_executable}

echo "Done"

# -------------------------------------------------------------------------------------------- #
# pre-uninstall section:
# -------------------------------------------------------------------------------------------- #
%preun

echo "[INFO] stoping service %{_service_name}"
service %{_service_name} stop &> /dev/null

if [ $1 == 0 ]; then

  echo "[INFO] Removing application log files"
  # Log
  [ -d %{_iotamanager_log_dir} ] && /bin/rm -rf %{_iotamanager_log_dir}

  echo "[INFO] Removing application run files"
  # Log
  [ -d %{_iotamanager_pid_dir} ] && /bin/rm -rf %{_iotamanager_pid_dir}

  echo "[INFO] Removing application user"
  userdel -fr %{_project_user}

  echo "[INFO] Removing application service"
  chkconfig --del %{_service_name}
  echo "Done"
fi

# -------------------------------------------------------------------------------------------- #
# post-uninstall section:
# clean section:
# -------------------------------------------------------------------------------------------- #
%postun
%clean


# -------------------------------------------------------------------------------------------- #
# Files to add to the RPM
# -------------------------------------------------------------------------------------------- #
%files
%defattr(644,%{_project_user},%{_project_user},755)
%config /etc/init.d/%{_service_name}
%attr(755, root, root) /etc/init.d/%{_service_name}
%config /etc/iotamanager.d/iotamanager.default.conf
%config /etc/logrotate.d/logrotate-%{_service_name}.conf
%config /etc/cron.d/cron-logrotate-%{_service_name}-size
%config /etc/sysconfig/logrotate-%{_service_name}-size
%config /etc/sysconfig/iotamanager.conf
%{_install_dir}

%changelog
* Tue Aug 13 2019 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.7.0
- Fix: add `type` to query about configuration protocol
- Upgrade iotagent-node-lib dependency from 2.9.0 to 2.10.0

* Wed May 22 2019 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.6.0
- Upgrade from node:8.12.0-slim to node:8.16.0-slim as base image in Dockerfile
- Upgrade logops dependency from 1.0.0 to 2.1.0
- Upgrade iotagent-node-lib dependency from 2.8.1 to 2.9.0

* Wed Dec 19 2018 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.5.0
- Set Nodejs 8.12.0 as minimum version in packages.json (effectively removing Nodev4 and Nodev6 as supported versions)
- Fix: save cbHost in configuration
- Add: use NodeJS 8 in Dockerfile
- Add: use PM2 in Dockerfile
- Upgrade: iotagent-node-lib dependence from x to 2.8.1
- Upgrade: mongoose dependence from ~4.1.15 to 4.13.14
- Upgrade: requests dependence from 2.74.0 to 2.88.0
- Upgrade: express dependence from ~4.11.2 to 4.16.4
- Upgrade: mocha development dependence from 2.4.5 to 5.2.0
- Upgrade: istanbul development dependence from ~0.1.34 to 0.4.5
- Remove: old unused development dependencies (closure-linter-wrapper, chai, sinon, sinon-chai, grunt and grunt related module)

* Mon Aug 06 2018 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.4.0
- Update iotagent-node-lib to 2.7.x
- Fix: handle syntax error (#144)
- Fix: check protocol on creation device before use it (#142)
- Fix: static_attributes protocol from iota are not retrieved (#140)
- Using precise dependencies (~=) in packages.json
- Remove mongodb dependence from packages.json (already in iota-node-lib)

* Tue Feb 27 2018 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.3.0
- Update ioagent-node-lib to 2.6.x
- FIx: add mongodb dependence into dependencies in package.json

* Wed Oct 28 2017 Fermin Galan <fermin.galanmarquez@telefonica.com> 1.2.0
- FEATURE update node version to 4.8.4
- Update MongoDB driver in order to fix NODE-818 error (#120)

* Fri Nov 16 2016 Daniel Moran <daniel.moranjimenez@telefonica.com> 1.1.1
- FIX include protocol in query url iota devices (#104)

* Fri Nov 11 2016 Daniel Moran <daniel.moranjimenez@telefonica.com> 1.1.0

- ADD Configurable IoTManager path
- ADD mongodb retries
- FIX total count of results / devices
- FIX update protocol apikey param
- FIX missed resource in header redirected to iota
- FIX protocol filter in get protocols
- FIX protocol filter in list protocols
- FIX translation body iota redirector
- FIX way to handle non 500 errors
- FIX format for duplicated conform IOTA cpp
- ADD operations manual (#87)

* Fri Sep 09 2016 Daniel Moran <daniel.moranjimenez@telefonica.com> 1.0.0

- Add Protocol Creation features (#1)
- Add Protocol List features (#1)
- Add Service Update features (#2)
- Add API for log management (#8)
- Add RPM and linux service (#3)
- Add executable (#5)
- Add configurations List features (#7)
- Add provisioning request redirection (#7)
- Add delete protocol features (#1)
- Add Dockerfile (#14)
- FIX Support multiple protocols in the `protocol` field (#17)
- FIX Resource missing in redirection (#21)
- FIX Wrong result for device group creation (#23)
- FIX Return all the devices for all the protocols (#25)
- FIX Presence of etag caused Express to return 304 from the IotAgent (#27)
- ADD Device Group GETs should contain a description field (#31)
- FIX Failed request splitting for Device Creation
- FIX IoTManager crashes redirecting due to multiple callbacks (#34)
- FIX Can't set headers after they are sent (#37)
- FIX Single GET requests should have multiple request syntax (#40)
- FIX Exception trying to decode empty body.
